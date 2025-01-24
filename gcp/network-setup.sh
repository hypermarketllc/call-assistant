#!/bin/bash

# Create VPC network
gcloud compute networks create call-assistant-vpc \
    --subnet-mode=auto \
    --bgp-routing-mode=regional

# Create firewall rules
gcloud compute firewall-rules create allow-http-https \
    --network=call-assistant-vpc \
    --allow=tcp:80,tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=web-server

gcloud compute firewall-rules create allow-health-check \
    --network=call-assistant-vpc \
    --allow=tcp:3000,tcp:3001 \
    --source-ranges=130.211.0.0/22,35.191.0.0/16 \
    --target-tags=web-server

# Create instance template
gcloud compute instance-templates create call-assistant-template \
    --machine-type=e2-medium \
    --network=call-assistant-vpc \
    --tags=web-server \
    --metadata-from-file=startup-script=startup-script.sh \
    --image-family=debian-11 \
    --image-project=debian-cloud

# Create managed instance group
gcloud compute instance-groups managed create call-assistant-mig \
    --template=call-assistant-template \
    --size=2 \
    --zone=us-central1-a

# Configure autoscaling
gcloud compute instance-groups managed set-autoscaling call-assistant-mig \
    --zone=us-central1-a \
    --max-num-replicas=5 \
    --target-cpu-utilization=0.7 \
    --cool-down-period=60
