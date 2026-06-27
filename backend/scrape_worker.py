"""Standalone script — called by main.py via subprocess. Prints JSON to stdout."""
import json
import sys

if __name__ == '__main__':
    url = sys.argv[1]
    try:
        from scraper import scrape_product_page
        result = scrape_product_page(url)
        print(json.dumps(result))
    except Exception as e:
        import traceback
        sys.stderr.write(traceback.format_exc())
        print(json.dumps({'error': str(e) or traceback.format_exc().strip().splitlines()[-1]}))
