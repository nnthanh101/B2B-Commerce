provider "docker" {
  # Talks to the host Docker daemon. When run via the nnthanh101/terraform image,
  # mount the socket: -v /var/run/docker.sock:/var/run/docker.sock
}
