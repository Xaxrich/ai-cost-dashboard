#!/usr/bin/env python3
"""
X/Twitter API test script using OAuth 1.0a
Tests: account verification + tweet posting
"""
import urllib.request
import urllib.parse
import hashlib
import hmac
import base64
import time
import uuid
import json
import sys
import ssl

# SSL fix for macOS Python
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

# Proxy setup (bypass Cloudflare blocking from China)
PROXY_HOST = "127.0.0.1"
PROXY_PORT = 8080
proxy_handler = urllib.request.ProxyHandler({
    'https': f'http://{PROXY_HOST}:{PROXY_PORT}',
    'http': f'http://{PROXY_HOST}:{PROXY_PORT}',
})
opener = urllib.request.build_opener(
    proxy_handler,
    urllib.request.HTTPSHandler(context=ssl_ctx),
)
urllib.request.install_opener(opener)

# Credentials
CONSUMER_KEY = "THQ5MJpAu0Yr3bYr3UqlraLDj"
CONSUMER_SECRET = "JnQaQrgNsh1UIebBky217WJ7SltxNs0JRJ2pwB73caAKFirI7C"
ACCESS_TOKEN = "1943548112557228032-CXlOFdGmC7G6rn2NiwLSAIgiqDAA0u"
ACCESS_TOKEN_SECRET = "a1TtvyvOJz2H3ODrw5PfDPqf7HUUO7AEaCswg6lJBsnEG"

def percent_encode(s):
    return urllib.parse.quote(str(s), safe='')

def generate_oauth_signature(method, url, params, consumer_secret, token_secret):
    sorted_params = '&'.join(f'{percent_encode(k)}={percent_encode(v)}' for k, v in sorted(params.items()))
    base_string = f'{method}&{percent_encode(url)}&{percent_encode(sorted_params)}'
    signing_key = f'{percent_encode(consumer_secret)}&{percent_encode(token_secret)}'
    signature = base64.b64encode(hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha256).digest()).decode()
    return signature

def make_oauth_header(method, url, extra_params=None):
    oauth_params = {
        'oauth_consumer_key': CONSUMER_KEY,
        'oauth_nonce': uuid.uuid4().hex,
        'oauth_signature_method': 'HMAC-SHA256',
        'oauth_timestamp': str(int(time.time())),
        'oauth_token': ACCESS_TOKEN,
        'oauth_version': '1.0',
    }
    all_params = {**oauth_params}
    if extra_params:
        all_params.update(extra_params)

    signature = generate_oauth_signature(method, url, all_params, CONSUMER_SECRET, ACCESS_TOKEN_SECRET)
    oauth_params['oauth_signature'] = signature

    header = 'OAuth ' + ', '.join(f'{percent_encode(k)}="{percent_encode(v)}"' for k, v in sorted(oauth_params.items()))
    return header

def verify_credentials():
    url = 'https://api.twitter.com/2/users/me'
    header = make_oauth_header('GET', url)
    req = urllib.request.Request(url, headers={'Authorization': header})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"✅ Connected! Account: @{data['data'].get('username', '?')} (ID: {data['data']['id']})")
            return data['data']
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"❌ Auth failed ({e.code}): {body}")
        return None

def post_tweet(text):
    url = 'https://api.twitter.com/2/tweets'
    payload = json.dumps({"text": text}).encode()
    header = make_oauth_header('POST', url)
    req = urllib.request.Request(url, data=payload, headers={
        'Authorization': header,
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            tweet_id = data['data']['id']
            print(f"✅ Tweet posted! ID: {tweet_id}")
            print(f"   https://x.com/i/status/{tweet_id}")
            return data
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"❌ Tweet failed ({e.code}): {body}")
        return None

if __name__ == '__main__':
    print("=== X/Twitter API Test ===\n")

    print("1. Verifying credentials...")
    user = verify_credentials()

    if user and '--tweet' in sys.argv:
        idx = sys.argv.index('--tweet')
        text = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else "Testing DevCostTracker API connection 🔧"
        print(f"\n2. Posting tweet: \"{text[:50]}...\"")
        post_tweet(text)
    elif user:
        print("\nCredentials OK. Use --tweet \"text\" to post a test tweet.")
