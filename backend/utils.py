def get_text(key, language_code='en'):
    translations = {
        'en': {
            'data_upload': 'Data Upload',
            'forecast': 'Forecast',
            'log': 'Log'
        },
        'pt': {
            'data_upload': 'Carregar Dados',
            'forecast': 'Previsão',
            'log': 'Log'
        }
    }
    return translations.get(language_code, translations['en']).get(key, key)