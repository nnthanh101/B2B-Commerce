output "media_bucket_id" {
  description = "ID of the media S3 bucket."
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "ARN of the media S3 bucket."
  value       = aws_s3_bucket.media.arn
}

output "sqs_queue_url" {
  description = "URL of the Medusa event bus SQS queue."
  value       = aws_sqs_queue.events.url
}

output "sqs_queue_arn" {
  description = "ARN of the Medusa event bus SQS queue."
  value       = aws_sqs_queue.events.arn
}

output "sqs_dlq_arn" {
  description = "ARN of the Medusa event bus dead-letter queue."
  value       = aws_sqs_queue.events_dlq.arn
}

output "sns_topic_arn" {
  description = "ARN of the Medusa event bus SNS topic."
  value       = aws_sns_topic.events.arn
}

output "secret_arns" {
  description = "Map of secret name to ARN for all Secrets Manager secrets."
  value = {
    DATABASE_URL  = aws_secretsmanager_secret.database_url.arn
    REDIS_URL     = aws_secretsmanager_secret.redis_url.arn
    JWT_SECRET    = aws_secretsmanager_secret.jwt_secret.arn
    COOKIE_SECRET = aws_secretsmanager_secret.cookie_secret.arn
  }
}
