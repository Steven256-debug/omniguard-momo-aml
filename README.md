<div align="center">
  <h1>🛡️ OmniGuard MoMo AML (Enterprise Edition)</h1>
  <p><i>A holistic, graph-based Machine Learning Anti-Money Laundering engine tailored for Tier-1 Banks and Payment Service Providers (PSPs).</i></p>

  ![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
  ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
  ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  ![Amazon DynamoDB](https://img.shields.io/badge/Amazon%20DynamoDB-4053D6?style=for-the-badge&logo=Amazon%20DynamoDB&logoColor=white)
  ![Serverless](https://img.shields.io/badge/Serverless-%23FD5750.svg?style=for-the-badge&logo=serverless&logoColor=white)

  <br/><br/>
  <a href="https://d2fui87kr2y14y.cloudfront.net" target="_blank">
    <img src="https://img.shields.io/badge/Live_Dashboard-CloudFront-blue?style=for-the-badge&logo=amazon-aws" alt="Live Demo"/>
  </a>
  <a href="https://oyqjhxi283.execute-api.us-east-1.amazonaws.com/prod/score" target="_blank">
    <img src="https://img.shields.io/badge/Scoring_API-Active-green?style=for-the-badge&logo=aws-api-gateway" alt="Scoring API"/>
  </a>
</div>

---

OmniGuard MoMo AML is an enterprise-grade solution that securely evaluates Mobile Money (MoMo) transactions in real-time. The system seamlessly integrates with core banking ledgers, enables human investigation workflows, and enforces robust system resilience through graceful degradation.

---

## 🌐 Live Production Deployments

| Subsystem / Interface | Live Endpoint / URL | Description | Status |
| :--- | :--- | :--- | :---: |
| **Fraud Analyst Dashboard** | [https://d2fui87kr2y14y.cloudfront.net](https://d2fui87kr2y14y.cloudfront.net) | Interactive Case Management, Model Explainability & Regional Trends UI | 🟢 Live |
| **Real-Time Scoring API** | `POST` `https://oyqjhxi283.execute-api.us-east-1.amazonaws.com/prod/score` | Real-time AML evaluation with dynamic fallback circuit breaker | 🟢 Live |
| **HITL Analyst Feedback API** | `POST` `https://6er509nbdk.execute-api.us-east-1.amazonaws.com/prod/feedback` | S3 feedback audit pipeline with dual-control supervisor alerts | 🟢 Live |

---

## 🚨 The Problem Statement
As Ghana rapidly advances its financial inclusion goals, fraudulent activity is migrating from traditional banking toward the digital edge. According to the Bank of Ghana's 2025 Fraud Report, electronic fraud incidents within the Payment Service Provider (PSP) and mobile money sector surged by 54% to 24,124 cases, with the total value at risk nearly doubling to GH¢37 million.

Modern financial criminals utilize complex, multi-hop networks of synthetic identities, mule accounts, and burner devices to siphon funds. Traditional, rule-based Anti-Money Laundering (AML) systems are completely unequipped to track these relational networks. As a result, legacy systems generate massive volumes of false positives that exhaust human investigative resources, frustrate legitimate customers, and ultimately fail to stop coordinated fraud rings.

## 💡 The Solution
OmniGuard MoMo AML abandons static rules in favor of a cloud-native, AI-driven architectural pipeline. It solves the limitations of legacy systems through three core technological pillars:

- **Identity Unification**: Leverages **AWS Entity Resolution** to ingest disparate data streams and standardize records, assigning a single, persistent identifier to users even if they attempt to obfuscate their details across multiple networks.
- **Graph-Based Network Mapping**: Transactions and entities are mapped into **Amazon Neptune**, a memory-optimized graph database. By running community detection algorithms, the system instantly traverses complex relationships to visualize hidden fraud rings (e.g., detecting if 50 independent wallets are logging in from the same device fingerprint).
- **Unsupervised Machine Learning**: Graph metrics are piped into **Amazon SageMaker**, which learns the high-dimensional patterns of legitimate financial behavior. When a transaction deviates from these learned patterns, the model assigns a real-time anomaly score, freezing the transaction before settlement.

## 🌍 Significance & Impact
This project provides the highly resilient infrastructure required to safely scale financial inclusion across Ghana.

Beyond just detecting fraud, this architecture is designed with **Enterprise Systems Thinking**. By utilizing decoupled event routers (Amazon EventBridge) and fallback circuit breakers, the system guarantees that heavy machine-learning workloads never bottleneck the national payment grid. Furthermore, the inclusion of a Human-In-The-Loop (HITL) analyst dashboard ensures model explainability and continuous feedback, helping financial institutions maintain strict regulatory compliance with the Bank of Ghana's Cyber and Information Security Directive (CISD 2026).

---

## 🏗️ Architecture Overview

The system architecture is a highly decoupled, event-driven pipeline comprising the following key subsystems:

1. **Data Ingestion and Privacy**: Transaction logs and KYC records flow into an **Amazon S3 Data Lake**. **Amazon Macie** discovers and redacts PII before the data is leveraged for analysis.
2. **Identity & Graph Mapping**: **AWS Entity Resolution** matches fuzzy records (e.g., similar names, shared devices) to assign persistent customer IDs while isolating dynamic telco CGNAT IP addresses. These resolved entities form a graph stored in **Amazon Neptune Analytics**.
3. **Machine Learning Predictive Engine**: An unsupervised Anomaly Detection Autoencoder hosted on **Amazon SageMaker** evaluates incoming transactions by combining real-time metadata with sub-graph patterns.
4. **Resilient API & Enterprise Router**: Transactions are scored in real-time via an **API Gateway + AWS Lambda** implementation. Results are broadcast to the enterprise via **Amazon EventBridge**.
5. **Fraud Analyst Dashboard**: A **React.js** Single Page Application (SPA) securely hosted via **Amazon S3** and **Amazon CloudFront** using Origin Access Control (OAC), providing a Case Management view for the Fraud Investigation Unit (FIU).
6. **CI/CD Automation**: Fully automated GitOps lifecycle powered by **AWS CodePipeline** and **AWS CodeBuild**.

---

## 🔄 Enterprise Systems Thinking

OmniGuard is designed using Enterprise Systems Thinking principles, treating the AML capability not as an isolated black box, but as a continuous organizational metabolism.

### The Human-In-The-Loop (HITL) Feedback Loop
When the Fraud Investigation Unit (FIU) reviews a flagged transaction via the Dashboard, their decision (True Positive / False Positive) is routed to a dedicated S3 bucket (`omniguard-hitl-feedback`). This automatically triggers a retraining pipeline so the SageMaker Autoencoder evolves alongside emerging fraud typologies. High-value dispute reversals are safeguarded with dual-control supervisor audit checks.

### Enterprise Routing via Amazon EventBridge
Fraud detection must instantly inform downstream ledgers. The Scoring Lambda asynchronously publishes a `FraudScoringDecision` event to the `OmniGuard-EnterpriseBus`. Core Banking Systems (CBS) can instantly place holds on funds.

### Graceful Degradation & Circuit Breaking
To maintain the uptime of the national payment grid, if the SageMaker inference endpoint takes more than **200ms**, the API abandons the ML call and falls back to evaluating the transaction against lightweight, dynamic velocity and structuring rules stored in **Amazon DynamoDB**, utilizing tiered fail-open (< GH¢500) and fail-closed (≥ GH¢500) policies.

---

## 💻 API Payloads

### Scoring Request
```json
{
  "transaction_id": "TXN_A1B2C3D4E5",
  "sender_id": "USER_7890",
  "receiver_id": "USER_1234",
  "amount": 4500.00,
  "timestamp": "2026-08-30T10:00:00Z",
  "account_type": "RETAIL",
  "device_id": "DEV_X9Y8Z7",
  "ip_address": "192.168.1.45"
}
```

### EventBridge Event Payload
```json
{
  "version": "0",
  "detail-type": "FraudScoringDecision",
  "source": "omniguard.scoring",
  "detail": {
    "transaction_id": "TXN_A1B2C3D4E5",
    "scoring_result": {
      "status": "FLAGGED",
      "reason": "ML Anomaly Score: 0.89",
      "source": "SageMaker"
    }
  }
}
```

---

## 🚀 Quick Start Guide

1. **Infrastructure**: Deploy the core backend via the AWS SAM CLI:
   ```bash
   sam build --template-file infrastructure/template.yaml
   sam deploy --guided
   ```
2. **Simulation**: Generate synthetic MoMo transactions using `python simulation/generate_data.py`.
3. **Graph Setup**: Run the AWS Entity Resolution setup script in `graph_processing/setup_entity_resolution.py` and apply the Cypher queries in `load_neptune.cypher`.
4. **Frontend Dashboard**:
   ```bash
   cd frontend
   npm install
   npm run build
   aws s3 sync dist/ s3://omniguard-frontend-[YOUR-ACCOUNT-ID]-[REGION]
   ```
5. **Run Automated Unit Tests**:
   ```bash
   python -m unittest discover -s tests -p "test_*.py" -v
   ```

---

## ⚙️ CI/CD Deployment (AWS CodePipeline)

For a fully automated GitOps workflow, you can deploy the CI/CD pipeline directly from this repository:

1. Navigate to the AWS Console and create an **AWS CodeStar Connection** to your GitHub account. Note the Connection ARN.
2. Deploy the pipeline template:
   ```bash
   sam deploy --template-file infrastructure/pipeline.yaml --stack-name omniguard-pipeline --capabilities CAPABILITY_IAM --parameter-overrides GitHubConnectionArn="YOUR_ARN" GitHubRepositoryId="Steven256-debug/omniguard-momo-aml"
   ```
3. Any future pushes to the `main` branch will automatically trigger **AWS CodeBuild** to compile the React app, package the SAM template, deploy the infrastructure, and sync the static assets!

---

## 🔮 Future Works & Roadmap

To further establish OmniGuard MoMo AML as the pan-African benchmark for real-time digital payment security, the following roadmap capabilities are planned:

1. **Graph Neural Networks (GNNs) on Amazon Neptune ML**:
   - Transition from tabular autoencoder inference to inductive Graph Neural Networks (e.g., Relational Graph Convolutional Networks - RGCN and GraphSAGE) operating directly inside Amazon Neptune ML to compute dynamic graph topology and mule-ring embeddings in real-time.
2. **Cross-Border & Multi-Telco Federated Learning**:
   - Implement privacy-preserving Federated Learning across telco aggregators (MTN MoMo, Telecel Cash, AirtelTigo Money) and regional switches (GhIPSS, WAEMU) without exposing raw PII, detecting cross-network mule syndicates operating between Ghana, Nigeria, and Côte d'Ivoire.
3. **Biometric & Behavioral Telemetry Ingestion**:
   - Integrate mobile sensor telemetry (keystroke velocity, touchscreen tap pressure, and device orientation during USSD and mobile banking sessions) to preemptively flag account takeover, SIM-swap exploitation, and coerced transfers.
4. **Automated Regulatory STR/SAR Generation with Generative AI**:
   - Leverage Amazon Bedrock (Claude / Titan) to automatically synthesize multi-hop Neptune subgraphs, transaction timelines, and HITL investigation notes into regulatory-compliant Bank of Ghana Suspicious Transaction Reports (STRs / SARs) ready for instant FIU submission.
5. **Ultra-Low Latency Graph Feature Store**:
   - Integrate Amazon MemoryDB / ElastiCache Redis cluster synchronized with Neptune Streams to serve sub-5ms graph topological features (in-degree, out-degree, centrality metrics) directly to the real-time scoring engine without cold-start querying overhead.
