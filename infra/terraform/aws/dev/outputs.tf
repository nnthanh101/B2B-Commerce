output "applied_tags" {
  description = "FOCUS 1.2+ compliant tag map."
  value       = module.tags.common_tags
}

output "media_bucket_id" {
  description = "ID of the media S3 bucket."
  value       = module.foundation.media_bucket_id
}

output "sqs_queue_url" {
  description = "URL of the Medusa event bus SQS queue."
  value       = module.foundation.sqs_queue_url
}

output "sns_topic_arn" {
  description = "ARN of the Medusa event bus SNS topic."
  value       = module.foundation.sns_topic_arn
}

output "secret_arns" {
  description = "Map of secret name to ARN for all Secrets Manager secrets."
  value       = module.foundation.secret_arns
  sensitive   = true
}
