"""
OmniGuard MoMo AML — AWS Architecture Generator (Updated with 3-Tier Auto-Triage)
Generates the production architecture diagram with official AWS icons using python-diagrams.

Requirements:
    pip install diagrams
    Ensure Graphviz is installed on your OS (e.g., winget install Graphviz or choco install graphviz)

Usage:
    python scripts/generate_diagram.py
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Neptune, Dynamodb
from diagrams.aws.ml import Sagemaker
from diagrams.aws.integration import Eventbridge
from diagrams.aws.network import CloudFront, APIGateway
from diagrams.aws.storage import S3
from diagrams.aws.security import Macie
from diagrams.onprem.client import Users, Client

graph_attr = {
    "fontsize": "18",
    "bgcolor": "#0d1117",
    "fontcolor": "#ffffff",
    "pad": "0.6",
    "nodesep": "0.7",
    "ranksep": "0.9"
}

node_attr = {
    "fontcolor": "#ffffff",
    "fontsize": "12"
}

edge_attr = {
    "fontcolor": "#94a3b8",
    "fontsize": "10"
}

with Diagram(
    "OmniGuard MoMo AML — Enterprise Architecture & 3-Tier Auto-Triage",
    show=False,
    direction="LR",
    filename="architecture_diagram",
    outformat="png",
    graph_attr=graph_attr,
    node_attr=node_attr,
    edge_attr=edge_attr
):
    with Cluster("1. Ingestion Layer", graph_attr={"bgcolor": "#161b22", "fontcolor": "#38bdf8"}):
        momo_psps = Client("MoMo Telco PSPs\n(MTN, Telecel, AT)")
        cbs = Client("Core Banking (CBS)\nLedgers & Switches")
        api_gw = APIGateway("Amazon API Gateway\n(/score & /feedback)")

    with Cluster("2. Real-Time Scoring & Auto-Triage", graph_attr={"bgcolor": "#161b22", "fontcolor": "#f59e0b"}):
        scoring_lambda = Lambda("Scoring Lambda\n(SLA Guard & Triage)")
        sagemaker = Sagemaker("Amazon SageMaker\n(Anomaly Autoencoder)")
        dynamodb = Dynamodb("Amazon DynamoDB\n(Sliding Velocity & Fallback)")
        auto_triage = Lambda("3-Tier Auto-Triage &\nPattern Synthesizer")

    with Cluster("3. Identity & Graph Intelligence", graph_attr={"bgcolor": "#161b22", "fontcolor": "#06b6d4"}):
        s3_raw = S3("Amazon S3\n(Raw Data Lake)")
        macie = Macie("Amazon Macie\n(PII Discovery & Redact)")
        neptune = Neptune("Amazon Neptune\n(Graph Topology & Rings)")

    with Cluster("4. Enterprise Event Distribution", graph_attr={"bgcolor": "#161b22", "fontcolor": "#f43f5e"}):
        event_bus = Eventbridge("Amazon EventBridge\n(OmniGuard-EnterpriseBus)")
        cbs_hold = Client("CBS Settlement\nInstant Freeze / Hold")

    with Cluster("5. FIU Human-In-The-Loop (~6.5% Gray-Zone)", graph_attr={"bgcolor": "#161b22", "fontcolor": "#a855f7"}):
        cloudfront = CloudFront("Amazon CloudFront\n(OAC + S3)")
        analysts = Users("Fraud Analysts\n(130 Gray-Zone Cases/Day)")
        hitl_lambda = Lambda("HITL Audit Lambda\n(Dual-Control)")
        s3_feedback = S3("Amazon S3\n(Feedback & Triage Audit)")

    # Data Ingestion Connections
    momo_psps >> Edge(color="#38bdf8", label="POST /score") >> api_gw
    cbs >> Edge(color="#38bdf8") >> api_gw
    api_gw >> Edge(color="#a855f7") >> scoring_lambda

    # Scoring & Circuit Breaker Connections
    scoring_lambda >> Edge(color="#10b981", label="1. Sub-200ms ML") >> sagemaker
    sagemaker >> Edge(color="#10b981", style="dashed") >> scoring_lambda
    scoring_lambda >> Edge(color="#f59e0b", style="dashed", label="2. Fallback Timeout") >> dynamodb
    dynamodb >> Edge(color="#f59e0b", style="dashed") >> scoring_lambda
    scoring_lambda >> Edge(color="#f59e0b") >> auto_triage

    # Three-Tier Triage Routing
    auto_triage >> Edge(color="#ef4444", label="1. Auto-Block (19.5%)\nScore >= 0.90") >> event_bus
    auto_triage >> Edge(color="#10b981", style="dashed", label="2. Auto-Safe (74.0%)\nScore <= 0.40") >> s3_feedback
    auto_triage >> Edge(color="#f59e0b", label="3. Gray-Zone (~6.5%)\n0.40 < Score < 0.90") >> analysts

    # Graph Ingestion
    s3_raw >> Edge(color="#10b981") >> macie
    macie >> Edge(color="#06b6d4", label="Resolved Entities") >> neptune
    neptune >> Edge(color="#06b6d4", style="dashed", label="Sub-Graph Risk") >> scoring_lambda

    # Event Distribution to CBS
    event_bus >> Edge(color="#ef4444", label="Instant Hold") >> cbs_hold

    # HITL Feedback Loop
    analysts >> Edge(color="#38bdf8") >> cloudfront
    analysts >> Edge(color="#a855f7", label="Override / Review") >> api_gw
    api_gw >> Edge(color="#a855f7") >> hitl_lambda
    hitl_lambda >> Edge(color="#a855f7") >> s3_feedback
    s3_feedback >> Edge(color="#10b981", style="dashed", label="Continuous Retrain") >> sagemaker

if __name__ == "__main__":
    print("Generating architecture diagram with official AWS icons...")
    print("Run with: python scripts/generate_diagram.py")
