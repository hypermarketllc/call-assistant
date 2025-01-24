#!/bin/bash

# Create health check
gcloud compute health-checks create http call-assistant-health-check \
    --port=3000 \
    --request-path=/health \
    --check-interval=30s \
    --timeout=5s \
    --unhealthy-threshold=2 \
    --healthy-threshold=2

# Create backend service
gcloud compute backend-services create call-assistant-backend \
    --protocol=HTTP \
    --port-name=http \
    --health-checks=call-assistant-health-check \
    --global

# Add instance group to backend service
gcloud compute backend-services add-backend call-assistant-backend \
    --instance-group=call-assistant-mig \
    --instance-group-zone=us-central1-a \
    --global

# Create URL map
gcloud compute url-maps create call-assistant-url-map \
    --default-service=call-assistant-backend

# Create SSL certificate
gcloud compute ssl-certificates create call-assistant-cert \
    --domains=your-domain.com

# Create HTTPS proxy
gcloud compute target-https-proxies create call-assistant-https-proxy \
    --url-map=call-assistant-url-map \
    --ssl-certificates=call-assistant-cert

# Create forwarding rule
gcloud compute forwarding-rules create call-assistant-https-forwarding-rule \
    --target-https-proxy=call-assistant-https-proxy \
    --global \
    --ports=443