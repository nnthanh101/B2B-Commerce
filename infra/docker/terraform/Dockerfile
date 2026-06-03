# nnthanh101/terraform — pinned, containerised Terraform runner for Digital-Commerce IaC.
# One reproducible toolchain for every stack (local Docker provider now, AWS in Phase 2),
# independent of whatever Terraform happens to be on the host.
#
# Build:  docker build -t nnthanh101/terraform:1.9.8 infra/docker/terraform
# Use:    docker run --rm -v "$PWD/infra/terraform:/work" nnthanh101/terraform:1.9.8 fmt -recursive
FROM alpine:3.20

ARG TERRAFORM_VERSION=1.9.8
ARG TFLINT_VERSION=0.53.0

# 定量 Fixed Quantity: versions are pinned, not floating.
RUN apk add --no-cache bash git curl unzip docker-cli aws-cli \
  && arch="$(uname -m)" \
  && case "$arch" in \
       x86_64) tfarch=amd64 ;; \
       aarch64) tfarch=arm64 ;; \
       *) echo "unsupported arch: $arch" && exit 1 ;; \
     esac \
  && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${tfarch}.zip" -o /tmp/tf.zip \
  && unzip /tmp/tf.zip -d /usr/local/bin && rm /tmp/tf.zip \
  && curl -fsSL "https://github.com/terraform-linters/tflint/releases/download/v${TFLINT_VERSION}/tflint_linux_${tfarch}.zip" -o /tmp/tflint.zip \
  && unzip /tmp/tflint.zip -d /usr/local/bin && rm /tmp/tflint.zip \
  && terraform version && tflint --version

WORKDIR /work
ENTRYPOINT ["terraform"]
CMD ["version"]
