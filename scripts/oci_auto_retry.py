# -*- coding: utf-8 -*-
import os, sys, time, random, datetime, oci
from pathlib import Path

print("================================================================")
print("  🚀 Oracle Cloud Ampere A1 (ARM) Auto-Retry Provisioner        ")
print("================================================================")

config = oci.config.from_file("C:/Users/tawan/.oci/config")
tenancy_id = config["tenancy"]
ad_name = "AVqd:AP-SINGAPORE-1-AD-1"

identity_client = oci.identity.IdentityClient(config)
compute_client = oci.core.ComputeClient(config)
net_client = oci.core.VirtualNetworkClient(config)

# 1. Resolve Subnet
subnets = [s for s in net_client.list_subnets(tenancy_id).data if s.display_name == "media-loader-subnet" and s.lifecycle_state == "AVAILABLE"]
if not subnets:
    print("[!] Subnet 'media-loader-subnet' not found. Please ensure VCN setup completed.")
    sys.exit(1)
subnet_id = subnets[0].id
print(f"[✓] Using Subnet: {subnet_id}")

# 2. Resolve Ubuntu ARM Image
images = [img for img in compute_client.list_images(tenancy_id, operating_system="Canonical Ubuntu", shape="VM.Standard.A1.Flex", sort_by="TIMECREATED", sort_order="DESC").data]
if not images:
    print("[!] No Canonical Ubuntu ARM images found.")
    sys.exit(1)
image_id = images[0].id
print(f"[✓] Using Image: {images[0].display_name} ({image_id})")

# 3. Resolve SSH Key
priv_key_file = Path.home() / ".ssh" / "media_loader_ssh"
pub_key_file = Path.home() / ".ssh" / "media_loader_ssh.pub"
if not pub_key_file.exists():
    print(f"[!] SSH Public Key not found at {pub_key_file}")
    sys.exit(1)
ssh_pub_key_str = pub_key_file.read_text(encoding="utf-8").strip()
print(f"[✓] SSH Key ready at: {priv_key_file}")

# 4. Check if already created
existing_instances = [i for i in compute_client.list_instances(tenancy_id).data if i.display_name == "media-loader-backend" and i.lifecycle_state in ["RUNNING", "PROVISIONING", "STARTING"]]
if existing_instances:
    inst = existing_instances[0]
    print(f"[✓] Instance already exists: {inst.display_name} (State: {inst.lifecycle_state})")
    sys.exit(0)

# 5. Retry Loop
attempt = 1
print("\n[*] Starting continuous auto-retry loop (every 60s)...\n")

launch_details = oci.core.models.LaunchInstanceDetails(
    compartment_id=tenancy_id,
    availability_domain=ad_name,
    display_name="media-loader-backend",
    shape="VM.Standard.A1.Flex",
    shape_config=oci.core.models.LaunchInstanceShapeConfigDetails(ocpus=2.0, memory_in_gbs=12.0),
    image_id=image_id,
    create_vnic_details=oci.core.models.CreateVnicDetails(
        subnet_id=subnet_id,
        assign_public_ip=True,
        display_name="media-loader-vnic"
    ),
    metadata={"ssh_authorized_keys": ssh_pub_key_str}
)

while True:
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now_str}] [Attempt #{attempt}] Requesting Ampere A1 (2 OCPU / 12GB RAM)...", end=" ", flush=True)
    try:
        instance = compute_client.launch_instance(launch_details).data
        inst_id = instance.id
        print(f"\n\n🎉 SUCCESS! Instance created with ID: {inst_id}")
        
        print("[*] Waiting for instance state to become RUNNING...")
        wait_resp = compute_client.get_instance(inst_id)
        while wait_resp.data.lifecycle_state not in ["RUNNING", "TERMINATED", "FAILED"]:
            print(f"  -> Current State: {wait_resp.data.lifecycle_state} (waiting 5s)...")
            time.sleep(5)
            wait_resp = compute_client.get_instance(inst_id)
            
        vnics = compute_client.list_vnic_attachments(compartment_id=tenancy_id, instance_id=inst_id).data
        vnic_id = vnics[0].vnic_id
        vnic = net_client.get_vnic(vnic_id).data
        public_ip = vnic.public_ip
        
        summary = f"""================================================================
  🎉 ORACLE CLOUD VPS DEPLOYED SUCCESSFULLY!
================================================================
Instance Name : {wait_resp.data.display_name}
State         : {wait_resp.data.lifecycle_state}
Shape         : {wait_resp.data.shape} (2 OCPU / 12GB RAM)
Public IP     : {public_ip}
SSH Key       : {priv_key_file}

SSH Command to connect:
  ssh -i "{priv_key_file}" ubuntu@{public_ip}
================================================================
"""
        print("\n" + summary)
        Path("oci_provisioned.txt").write_text(summary, encoding="utf-8")
        break
        
    except oci.exceptions.ServiceError as e:
        if "Out of host capacity" in str(e) or e.status == 500:
            print("❌ Capacity full. Retrying in 60s...")
        elif e.status == 429:
            print("⏳ Rate limited. Backing off for 65s...")
        else:
            print(f"⚠️ Service error ({e.status} {e.code}): {e.message[:80]}...")
            
    except Exception as ex:
        print(f"⚠️ Error: {type(ex).__name__} - {str(ex)[:80]}")
        
    attempt += 1
    sleep_sec = 60 + random.randint(0, 10)
    time.sleep(sleep_sec)
