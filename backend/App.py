from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import pandas as pd
import os
from data_processing import process_data
from forecasting import compute_forecast_for_sku, compute_initial_forecasts

app = Flask(__name__)
app.secret_key = 'your-secret-key-12345'  # Replace with a secure key in production
CORS(app, supports_credentials=True)  # Enable CORS with credentials support for sessions

# Set up Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Simple user model (replace with a database later)
class User(UserMixin):
    def __init__(self, id):
        self.id = id

# Hardcoded users (replace with a database in production)
users = {'admin': 'password'}

@login_manager.user_loader
def load_user(user_id):
    if user_id in users:
        return User(user_id)
    return None

# In-memory storage for simplicity (replace with a database later)
app.config['DATA'] = None
app.config['ADJUSTMENTS'] = {}
app.config['LOGS'] = []

# Language configuration (default to English)
language_code = 'en'

# Load default file on startup
def load_default_file():
    default_file_path = os.path.join(os.getcwd(), "historic_data.csv")
    if os.path.exists(default_file_path):
        with open(default_file_path, 'rb') as file:
            try:
                df, logs = process_data(file, language_code, delimiter=';')
                app.config['DATA'] = df
                app.config['LOGS'].extend(logs)
                app.config['LOGS'].append(f"Automatically loaded 'historic_data.csv' from {default_file_path}")
                # Initialize adjustments for each SKU
                sku_list = df['SKU'].unique()
                for sku in sku_list:
                    sku_df = df[df['SKU'] == sku][['Month']].set_index('Month')
                    app.config['ADJUSTMENTS'][sku] = pd.Series(0.0, index=sku_df.index.strftime('%Y-%m')).to_dict()
            except Exception as e:
                app.config['LOGS'].append(f"Error loading default file: {str(e)}")

load_default_file()

@app.route('/api/login', methods=['POST'])
def login():
    if current_user.is_authenticated:
        return jsonify({'message': 'Already logged in'})

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if username in users and users[username] == password:
        user = User(username)
        login_user(user)
        app.config['LOGS'].append(f"User {username} logged in")
        return jsonify({'message': 'Logged in successfully'})
    else:
        app.config['LOGS'].append(f"Failed login attempt for username: {username}")
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    username = current_user.id
    logout_user()
    app.config['LOGS'].append(f"User {username} logged out")
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'username': current_user.id})
    return jsonify({'authenticated': False})

@app.route('/api/data', methods=['GET', 'POST'])
@login_required
def handle_data():
    if request.method == 'POST':
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        file = request.files['file']
        try:
            df, logs = process_data(file, language_code, delimiter=';')
            app.config['DATA'] = df
            app.config['LOGS'].extend(logs)
            app.config['LOGS'].append("Set app.config['DATA'] with uploaded file")
            app.config['ADJUSTMENTS'] = {}
            sku_list = df['SKU'].unique()
            for sku in sku_list:
                sku_df = df[df['SKU'] == sku][['Month']].set_index('Month')
                app.config['ADJUSTMENTS'][sku] = pd.Series(0.0, index=sku_df.index.strftime('%Y-%m')).to_dict()
            return jsonify({'message': 'File uploaded successfully'})
        except Exception as e:
            app.config['LOGS'].append(f"Error processing file: {str(e)}")
            return jsonify({'error': str(e)}), 500
    else:
        if app.config['DATA'] is None:
            return jsonify({'error': 'No data available'}), 404
        return jsonify(app.config['DATA'].to_dict('records'))

@app.route('/api/forecast/<sku>', methods=['GET'])
@login_required
def get_forecast(sku):
    if app.config['DATA'] is None:
        return jsonify({'error': 'No data available'}), 404

    forecast_periods = 12
    models_to_run = ["Simple Moving Average"]

    sku_groups = app.config['DATA'].groupby('SKU')
    df_hash = pd.util.hash_pandas_object(app.config['DATA']).sum()
    all_forecasts_dict, historical_data_dict, forecast_logs = compute_initial_forecasts(sku_groups, forecast_periods, models_to_run, df_hash)
    app.config['LOGS'].extend(forecast_logs)

    if sku not in historical_data_dict:
        return jsonify({'error': 'SKU not found'}), 404

    sku_df = historical_data_dict[sku]
    forecast_df = all_forecasts_dict[sku].copy()

    historical_df = sku_df.reset_index()
    historical_df['Type'] = 'Historical'
    forecast_df = forecast_df.reset_index().rename(columns={'index': 'Month'})
    forecast_df['Type'] = 'Forecast'
    forecast_df['Units'] = None

    combined_df = pd.concat([historical_df, forecast_df], ignore_index=True)
    combined_df = combined_df.sort_values('Month')
    combined_df['Month_Str'] = combined_df['Month'].dt.strftime('%Y-%m')

    adjustments = app.config['ADJUSTMENTS'].get(sku, {})
    combined_df['Adjustment'] = combined_df['Month_Str'].map(adjustments).fillna(0.0)
    combined_df['Corrected Units'] = combined_df.apply(
        lambda row: row['Units'] + row['Adjustment'] if row['Type'] == 'Historical' else None, axis=1
    )

    table_df = combined_df.set_index('Month_Str')[['Units', 'Adjustment', 'Corrected Units']].T
    table_df.reset_index(inplace=True)
    table_df.rename(columns={'index': 'Metric'}, inplace=True)
    table_df['Metric'] = table_df['Metric'].replace({
        'Units': 'Historical Units',
        'Adjustment': 'Adjustment',
        'Corrected Units': 'Corrected Units'
    })

    chart_data = {
        'historical': {
            'x': combined_df[combined_df['Type'] == 'Historical']['Month'].dt.strftime('%Y-%m').tolist(),
            'units': combined_df[combined_df['Type'] == 'Historical']['Units'].tolist(),
            'corrected_units': combined_df[combined_df['Type'] == 'Historical']['Corrected Units'].fillna(combined_df['Units']).tolist()
        },
        'forecast': {
            'x': combined_df['Month'].dt.strftime('%Y-%m').tolist(),
            'sma_forecast': combined_df['SMA_Forecast'].tolist() if 'SMA_Forecast' in combined_df.columns else []
        }
    }

    return jsonify({
        'table_data': table_df.to_dict('records'),
        'chart_data': chart_data,
        'sku_list': list(sku_groups.groups.keys())
    })

@app.route('/api/adjustments/<sku>', methods=['POST'])
@login_required
def update_adjustments(sku):
    data = request.get_json()
    adjustments = data.get('adjustments', {})
    app.config['ADJUSTMENTS'][sku] = {k: float(v) for k, v in adjustments.items()}
    app.config['LOGS'].append(f"Updated adjustments for SKU {sku}: {app.config['ADJUSTMENTS'][sku]}")
    return jsonify({'message': 'Adjustments updated'})

@app.route('/api/logs', methods=['GET'])
@login_required
def get_logs():
    return jsonify(app.config['LOGS'])

if __name__ == '__main__':
    app.run(debug=True, port=5000)