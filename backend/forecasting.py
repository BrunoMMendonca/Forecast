import pandas as pd

def compute_forecast_for_sku(data, forecast_periods, models_to_run, _cache_key=None):
    log_messages = []
    log_messages.append("Computing forecast for data")
    # Forecasting logic (e.g., Simple Moving Average)
    forecast_df = pd.DataFrame()  # Placeholder (replace with your actual logic)
    return forecast_df, log_messages

def compute_initial_forecasts(sku_groups, forecast_periods, models_to_run, df_hash):
    log_messages = []
    log_messages.append("Computing initial forecasts")
    all_forecasts_dict = {}
    historical_data_dict = {}
    for sku, sku_df in sku_groups:
        historical_data_dict[sku] = sku_df
        forecast_df, forecast_logs = compute_forecast_for_sku(sku_df, forecast_periods, models_to_run)
        all_forecasts_dict[sku] = forecast_df
        log_messages.extend(forecast_logs)
    return all_forecasts_dict, historical_data_dict, log_messages