# -*- coding: utf-8 -*-
import os, sys, time, oci
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

print("================================================================")
print("  Automating Oracle Cloud VPS Provisioning from Local CLI       ")
print("================================================================")

config = oci.config.from_file("C:/Users/tawan/.oci/config")
tenancy_id = config["tenancy"]
region = config["region"]

identity_client = oci.identity.IdentityClient(config)
compute_client = oci.core.ComputeClient(config)
net_client = oci.core.VirtualNetworkClient(config)

# 1. Availability Domain
print("[1/6] Finding Availability Domain...")
ads = identity_client.list_availability_domains(tenancy_id).data
ad_name = ads[0].name
print(f"  -> Availability Domain: {ad_name}")

# 2. SSH Key
print("[2/6] Preparing SSH Key Pair...")
ssh_dir = Path.home() / ".ssh"
ssh_dir.mkdir(parents=True, exist_ok=True)
priv_key_file = ssh_dir / "media_loader_ssh"
pub_key_file = ssh_dir / "media_loader_ssh.pub"

if not priv_key_file.exists():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    )
    priv_key_file.write_bytes(priv_pem)
    pub_openssh = key.public_key().public_bytes(
        encoding=serialization.Encoding.OpenSSH,
        format=serialization.PublicFormat.OpenSSH
    )
    pub_key_file.write_bytes(pub_openssh)
    print(f"  -> Generated SSH key at: {priv_key_file}")
else:
    print(f"  -> Using existing SSH key at: {priv_key_file}")

ssh_pub_key_str = pub_key_file.read_text(encoding="utf-8").strip()

# 3. Network Setup
print("[3/6] Setting up Networking (VCN, Gateway, Route Table, Subnet)...")
vcns = [v for v in net_client.list_vcns(compartment_id=tenancy_id).data if v.display_name == "media-loader-vcn" and v.lifecycle_state == "AVAILABLE"]
if vcns:
    vcn_id = vcns[0].id
    print(f"  -> Using existing VCN: {vcn_id}")
else:
    vcn_id = net_client.create_vcn(oci.core.models.CreateVcnDetails(
        cidr_blocks=["10.0.0.0/16"],
        compartment_id=tenancy_id,
        display_name="media-loader-vcn"
    )).data.id
    print(f"  -> Created VCN: {vcn_id}")

igs = [g for g in net_client.list_internet_gateways(compartment_id=tenancy_id, vcn_id=vcn_id).data if g.display_name == "media-loader-ig" and g.lifecycle_state == "AVAILABLE"]
if igs:
    ig_id = igs[0].id
else:
    ig_id = net_client.create_internet_gateway(oci.core.models.CreateInternetGatewayDetails(
        compartment_id=tenancy_id,
        vcn_id=vcn_id,
        is_enabled=True,
        display_name="media-loader-ig"
    )).data.id
    print(f"  -> Created Internet Gateway: {ig_id}")

rts = [r for r in net_client.list_route_tables(compartment_id=tenancy_id, vcn_id=vcn_id).data if r.display_name == "media-loader-rt" and r.lifecycle_state == "AVAILABLE"]
if rts:
    rt_id = rts[0].id
else:
    rules = [oci.core.models.RouteRule(cidr_block="0.0.0.0/0", network_entity_id=ig_id, description="Default internet")]
    rt_id = net_client.create_route_table(oci.core.models.CreateRouteTableDetails(
        compartment_id=tenancy_id,
        vcn_id=vcn_id,
        display_name="media-loader-rt",
        route_rules=rules
    )).data.id
    print(f"  -> Created Route Table: {rt_id}")

sec_lists = [s for s in net_client.list_security_lists(compartment_id=tenancy_id, vcn_id=vcn_id).data if s.display_name == "media-loader-seclist"]
if sec_lists:
    sec_id = sec_lists[0].id
else:
    ing = [
        oci.core.models.IngressSecurityRule(protocol="6", source="0.0.0.0/0", tcp_options=oci.core.models.TcpOptions(destination_port_range=oci.core.models.PortRange(min=22, max=22)), description="SSH"),
        oci.core.models.IngressSecurityRule(protocol="6", source="0.0.0.0/0", tcp_options=oci.core.models.TcpOptions(destination_port_range=oci.core.models.PortRange(min=8000, max=8000)), description="FastAPI"),
        oci.core.models.IngressSecurityRule(protocol="6", source="0.0.0.0/0", tcp_options=oci.core.models.TcpOptions(destination_port_range=oci.core.models.PortRange(min=80, max=80)), description="HTTP"),
        oci.core.models.IngressSecurityRule(protocol="6", source="0.0.0.0/0", tcp_options=oci.core.models.TcpOptions(destination_port_range=oci.core.models.PortRange(min=443, max=443)), description="HTTPS")
    ]
    eg = [oci.core.models.EgressSecurityRule(protocol="all", destination="0.0.0.0/0", description="All outbound")]
    sec_id = net_client.create_security_list(oci.core.models.CreateSecurityListDetails(
        compartment_id=tenancy_id,
        vcn_id=vcn_id,
        display_name="media-loader-seclist",
        ingress_security_rules=ing,
        egress_security_rules=eg
    )).data.id
    print(f"  -> Created Security List: {sec_id}")

subnets = [s for s in net_client.list_subnets(compartment_id=tenancy_id, vcn_id=vcn_id).data if s.display_name == "media-loader-subnet" and s.lifecycle_state == "AVAILABLE"]
if subnets:
    subnet_id = subnets[0].id
    print(f"  -> Using existing Subnet: {subnet_id}")
else:
    subnet_id = net_client.create_subnet(oci.core.models.CreateSubnetDetails(
        compartment_id=tenancy_id,
        vcn_id=vcn_id,
        cidr_block="10.0.0.0/24",
        route_table_id=rt_id,
        security_list_ids=[sec_id],
        display_name="media-loader-subnet"
    )).data.id
    print(f"  -> Created Public Subnet: {subnet_id}")

# 4. Ubuntu ARM Image
print("[4/6] Finding Ubuntu 24.04 ARM Image...")
images = compute_client.list_images(
    compartment_id=tenancy_id,
    operating_system="Canonical Ubuntu",
    shape="VM.Standard.A1.Flex",
    sort_by="TIMECREATED",
    sort_order="DESC"
).data
image_id = images[0].id
print(f"  -> Image: {images[0].display_name} ({image_id})")

# 5. Launch Instance
print("[5/6] Launching Ampere A1 (2 OCPU / 12GB RAM) Instance...")
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
instance = compute_client.launch_instance(launch_details).data
inst_id = instance.id
print(f"  -> Instance Launching ID: {inst_id}")

# 6. Wait for RUNNING
print("[6/6] Waiting for instance state to become RUNNING...")
wait_resp = compute_client.get_instance(inst_id)
while wait_resp.data.lifecycle_state not in ["RUNNING", "TERMINATED", "FAILED"]:
    print(f"  -> Current State: {wait_resp.data.lifecycle_state} (waiting 5s)...")
    time.sleep(5)
    wait_resp = compute_client.get_instance(inst_id)

if wait_resp.data.lifecycle_state != "RUNNING":
    raise Exception(f"Instance ended in state: {wait_resp.data.lifecycle_state}")

vnics = compute_client.list_vnic_attachments(compartment_id=tenancy_id, instance_id=inst_id).data
vnic_id = vnics[0].vnic_id
vnic = net_client.get_vnic(vnic_id).data
public_ip = vnic.public_ip

print("\n================================================================")
print("  ORACLE CLOUD VPS DEPLOYED SUCCESSFULLY!")
print("================================================================")
print(f"Instance Name : {wait_resp.data.display_name}")
print(f"State         : {wait_resp.data.lifecycle_state}")
print(f"Shape         : {wait_resp.data.shape} (2 OCPU / 12GB RAM)")
print(f"Public IP     : {public_ip}")
print(f"SSH Private Key: {priv_key_file}")
print("\nSSH Command to connect:")
print(f'  ssh -i "{priv_key_file}" ubuntu@{public_ip}')
print("================================================================\n")
