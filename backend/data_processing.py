import pandas as pd

def process_data(file, language_code, delimiter, app=None):
    # Initialize a list to collect log messages
    log_messages = []
    
    log_messages.append("Processing data with delimiter: " + delimiter)
    try:
        df = pd.read_csv(file, delimiter=delimiter, parse_dates=['Month'])
        log_messages.append("Parsed CSV with delimiter: " + delimiter)
        
        # Detect data orientation (based on your original logic)
        if 'Month' in df.columns and len(df.columns) > 1:
            log_messages.append("Detected data orientation: column-based. No action taken.")
        else:
            log_messages.append("Detected data orientation: row-based. Transposing data.")
            df = df.transpose()
        
        # Additional processing
        df['Units'] = pd.to_numeric(df['Units'], errors='coerce').fillna(0)
        
        return df, log_messages
    except Exception as e:
        log_messages.append(f"Error processing file: {str(e)}")
        raise Exception(f"Error processing file: {str(e)}") from e