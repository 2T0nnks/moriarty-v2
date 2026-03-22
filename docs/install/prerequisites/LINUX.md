## Linux Prerequisites

This guide covers the necessary steps to prepare a Linux system for running the application with Docker.

### Step 1: Install Docker Engine and Docker Compose

The installation method varies depending on your distribution.

#### For Debian/Ubuntu:

```bash
# Update package lists
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### For Fedora/RHEL/CentOS:

```bash
# Add the Docker repository
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo

# Install Docker Engine and Compose
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### For Arch Linux:

```bash
sudo pacman -Syu docker docker-compose
```

### Step 2: Start and Enable the Docker Service

After installation, you need to start the Docker daemon and enable it to run on boot.

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 3: Add Your User to the `docker` Group (Optional but Recommended)

To run Docker commands without `sudo`, add your user to the `docker` group.

```bash
sudo usermod -aG docker $USER
```

**Important:** You will need to **log out and log back in** for this change to take effect.

### Step 4: Install Git

Git is required to clone the project repository.

-   **Debian/Ubuntu:** `sudo apt-get install -y git`
-   **Fedora/RHEL:** `sudo dnf install -y git`
-   **Arch Linux:** `sudo pacman -S git`

With these steps completed, your system is ready. You can now proceed with the installation instructions in the main [README.md](../../../README.md).
