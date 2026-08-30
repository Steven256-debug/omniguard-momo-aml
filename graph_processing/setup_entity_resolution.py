import boto3
import json

def setup_entity_resolution(role_arn, input_s3_uri, output_s3_uri):
    """
    Sets up AWS Entity Resolution to match entities (users, devices, IPs)
    to create consolidated, persistent customer IDs.
    """
    print("Setting up AWS Entity Resolution Workflow...")
    
    client = boto3.client('entityresolution')
    
    # Define Schema Mapping for Transactions/Entities
    schema_name = "OmniGuardMoMoSchema"
    print(f"Creating schema mapping: {schema_name}")
    try:
        response = client.create_schema_mapping(
            schemaName=schema_name,
            mappedInputFields=[
                {
                    'fieldName': 'sender_id',
                    'type': 'NAME',
                    'matchKey': 'NAME'
                },
                {
                    'fieldName': 'device_id',
                    'type': 'STRING',
                    'matchKey': 'DEVICE'
                },
                {
                    'fieldName': 'ip_address',
                    'type': 'STRING',
                    'matchKey': 'ADDRESS'
                }
            ]
        )
        print("Schema mapping created.")
    except client.exceptions.ConflictException:
        print("Schema mapping already exists. Proceeding...")

    workflow_name = "OmniGuardMoMoMatchingWorkflow"
    print(f"Creating Matching Workflow: {workflow_name}")
    
    try:
        response = client.create_matching_workflow(
            workflowName=workflow_name,
            roleArn=role_arn,
            inputSourceConfig=[
                {
                    'inputSourceARN': input_s3_uri,
                    'schemaArn': f"arn:aws:entityresolution:region:account:schemamapping/{schema_name}" # Requires substitution in reality
                }
            ],
            outputSourceConfig=[
                {
                    'outputS3Path': output_s3_uri,
                    'applyNormalization': True
                }
            ],
            resolutionTechniques={
                'resolutionType': 'RULE_MATCHING',
                'ruleBasedProperties': {
                    'rules': [
                        {
                            'ruleName': 'ExactDeviceMatch',
                            'matchingKeys': ['DEVICE']
                        },
                        {
                            'ruleName': 'ExactIPMatch',
                            'matchingKeys': ['ADDRESS']
                        }
                    ],
                    'attributeMatchingModel': 'ONE_TO_ONE'
                }
            }
        )
        print("Matching Workflow created.")
    except client.exceptions.ConflictException:
        print("Matching Workflow already exists.")
    except Exception as e:
        print(f"An error occurred (this is expected if role_arn or S3 URIs are mocks): {e}")

if __name__ == "__main__":
    # Mock parameters for setup
    mock_role_arn = "arn:aws:iam::123456789012:role/EntityResolutionRole"
    mock_input_s3 = "arn:aws:s3:::omniguard-raw-data-123456789012-region/transactions.csv"
    mock_output_s3 = "s3://omniguard-raw-data-123456789012-region/resolved/"
    
    setup_entity_resolution(mock_role_arn, mock_input_s3, mock_output_s3)
