# Runs edge-tts with this environment's proxy CA bundle (edge-tts pins certifi's bundle).
import sys, certifi, os
certifi.where = lambda: os.environ.get("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt")
from edge_tts.util import main
sys.exit(main())
