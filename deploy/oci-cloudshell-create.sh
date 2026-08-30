#!/bin/bash
# ==================================================================
# Oracle Cloud Shell - 1-Click Compute Instance & Network Creator
# ==================================================================
set -e

echo ""
echo "==============================================================="
echo "  Creating Media Loader VPS on Oracle Cloud (Always Free ARM)  "
echo "==============================================================="
echo ""

# 1. Get Compartment ID
echo "[1/6] Finding Tenancy and Compartment..."
COMP_ID=$(oci iam compartment list --query "data[0].id" --raw-output 2>/dev/null || oci os ns get-metadata --query "data.\"default-compartment-id\"" --raw-output 2>/dev/null)
if [ -z "$COMP_ID" ] || [ "$COMP_ID" == "None" ]; then
    COMP_ID=$(oci iam compartment list --all --compartment-id-in-subtree true --query "data[0].\"compartment-id\"" --raw-output 2>/dev/null || true)
fi
if [ -z "$COMP_ID" ]; then
    COMP_ID=$(oci os ns get-metadata --query "data.id" --raw-output 2>/dev/null)
fi
echo "  -> Compartment ID: $COMP_ID"

# 2. Get Availability Domain
echo "[2/6] Detecting Availability Domain..."
AD_NAME=$(oci iam availability-domain list --query "data[0].name" --raw-output)
echo "  -> Availability Domain: $AD_NAME"

# 3. Create SSH Key if not exists
echo "[3/6] Preparing SSH Key Pair..."
mkdir -p ~/.ssh
if [ ! -f ~/.ssh/oci_media_key ]; then
    ssh-keygen -t rsa -b 2048 -f ~/.ssh/oci_media_key -N "" -q
fi

CC_SSH_PUB_KEY=$(cat ~/.ssh/oci_media_key.pub)

# 4. Check or Create VCN & Public Subnet
echo "[4/6] Creating Virtual Cloud Network (VCN) & Public Subnet..."
VCN_ID=$(oci network vcn create --compartment-id "$COMP_ID" --cidr-blocks '["10.0.0.0/16"]' --display-name "media-loader-vcn" --query "data.id" --raw-output 2>/dev/null || oci network vcn list --compartment-id "$COMP_ID" --display-name "media-loader-vcn" --query "data[0].id" --raw-output)

IG_ID=$(oci network internet-gateway create --compartment-id "$COMP_ID" --vcn-id "$VCN_ID" --is-enabled true --display-name "media-loader-ig" --query "data.id" --raw-output 2>/dev/null || oci network internet-gateway list --compartment-id "$COMP_ID" --vcn-id "$VCN_ID" --query "data[0].id" --rw-output 2>/dev/null || oci network internet-gateway list --compartment-id "$COMP_ID" --vcn-id "$VCN_ID" --query "data[0].id" --raw-output)

RT_ID=$(oci network route-table create --compartment-id "$COMP_ID" --vcn-id "$VCN_ID" --route-rules "[
{ \"cidrBlock\": \"0.0.0.0/0\", \"networkEntityId\": \"$IG_ID\" }]" --display-name "media-loader-rt" --query "data.id" --raw-output 2>/dev/null || oci network route-table list --compartment-id "$COMP_ID" --vcn-id "$VCN_ID" --query "data[0].id" --raw-output)

SUBNET_ID=$(oci network subnet create --compartment-id "$COMP_ID" --vcn-id "$VCN_ID" --cidr-block "10.0.0.0/24" --route-table-id "$RT_ID" --display-name "media-loader-subnet" --query "data.id" --raw-output 2>/dev/null || oci network subnet list --compartment-id "$COMP_ID" --vcn-id "$VCN_ID" --query "data[0].id" --raw-output)

echo "  -> VCN ID: $VCN_ID"
echo "  -> Subnet ID: $SUBNET_ID"

# 5. Find Latest Ubuntu ARM Image
echo "[5/6] Finding Ubuntu ARM (media-loader-backend) Image..."
IMG_ID=$(oci compute image list --compartment-id "$COMP_ID" --operating-system "Canonical Ubuntu" --shape "VM.Standard.A1.Flex" --sort-by TIMECREATED --sort-order DESC --query "data[0].id" --raw-output)
echo "  -> Image ID: $IMG_ID"

# 6. Launch Compute Instance
echo "[6/6] Launching Ampere A1 (2 OCPU / 12GB RAM) Compute Instance..."
INST_ID=$(oci compute instance launch \
  --compartment-id "$COMP_ID" \

  --availability-domain "$AD_NAME" \
  --shape "VM.Standard.A1.Flex" \

  --shape-config '{"ocpus":2,"memoryInGBs":12}' \

  --image-id "$IMG_ID" \
  --subnet-id "$SUBNET_ID" \
  --assign-public-ip true \
  --display-name "media-loader-backend" \
  --ssh-authorized-keys-file ~/.ssh/oci_media_key.pub \
  --query "data.id" --raw-output)

echo "  -> Instance Launching: $INST_ID"
echo ""
echo "Waiting for Instance to be in RUNNING state..."
oci compute instance get --instance-id "$INST_ID" --wait-for-state RUNNING --query "data.\"lifecycle-state\"" --raw-output

echo ""
VNIC_ID=$(oci compute instance list-vnics --instance-id "$INST_ID" --query "data[0].id" --raw-output)
PUB_IP=$(oci network vnic get --vnic-id "$VNIC_ID" --query "data.\"public-ip\"" --raw-output)

echo "==============================================================="
echo "  🎉 INSTANCE CREATED SUCCESSFULLY!"
echo "==============================================================="
echo ""
echo "Instance Name : media-loader-backend"
echo "Public IP     : $PUB_IP"
echo "SSH Key (on Cloud Shell): ~/.ssh/oci_media_key"
echo ""
echo "To connect via SSH right from this Cloud Shell:"
echo "  ssh -i ~/.ssh/oci_media_key ubuntu@$PUB_IP"
echo ""