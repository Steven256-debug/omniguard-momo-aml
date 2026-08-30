import argparse
import os
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

# Define the Autoencoder Architecture
class AnomalyAutoencoder(nn.Module):
    def __init__(self, input_dim):
        super(AnomalyAutoencoder, self).__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 16) # Latent space
        )
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Linear(64, input_dim)
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

def train(args):
    print("Loading training data from:", args.train)
    # In a real scenario, we would load data, preprocess and normalize features (Amount, Graph degrees, etc.)
    # For this script, we assume preprocessed numpy arrays or CSVs.
    try:
        train_df = pd.read_csv(os.path.join(args.train, "train_features.csv"))
        # Drop non-numeric for the autoencoder (e.g., transaction_id)
        numeric_features = train_df.select_dtypes(include=[np.number]).values
    except FileNotFoundError:
        # Mock data if running outside of SM for testing
        print("Warning: train_features.csv not found. Using synthetic random data for training test.")
        numeric_features = np.random.rand(1000, 10)
        
    input_dim = numeric_features.shape[1]
    
    # Convert to PyTorch tensors
    tensor_x = torch.Tensor(numeric_features)
    dataset = TensorDataset(tensor_x, tensor_x) # Autoencoder tries to reconstruct its input
    dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True)
    
    model = AnomalyAutoencoder(input_dim)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=args.learning_rate)
    
    print("Starting training...")
    for epoch in range(args.epochs):
        epoch_loss = 0.0
        for data in dataloader:
            inputs, targets = data
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
            
        print(f"Epoch [{epoch+1}/{args.epochs}], Loss: {epoch_loss/len(dataloader):.4f}")
        
    print("Training complete. Saving model...")
    # Save the model to the output directory provided by SageMaker
    model_path = os.path.join(args.model_dir, "model.pth")
    torch.save(model.state_dict(), model_path)
    print(f"Model saved to {model_path}")

# SageMaker execution entry point
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    
    # Hyperparameters
    parser.add_argument('--epochs', type=int, default=10)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--learning-rate', type=float, default=0.001)
    
    # SageMaker specific arguments. Defaults are set in the environment variables.
    parser.add_argument('--output-data-dir', type=str, default=os.environ.get('SM_OUTPUT_DATA_DIR', './'))
    parser.add_argument('--model-dir', type=str, default=os.environ.get('SM_MODEL_DIR', './model'))
    parser.add_argument('--train', type=str, default=os.environ.get('SM_CHANNEL_TRAIN', './data'))
    
    args = parser.parse_args()
    
    # Ensure model dir exists locally if testing
    os.makedirs(args.model_dir, exist_ok=True)
    
    train(args)
