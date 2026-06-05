output "applied_tags" {
  description = "FOCUS 1.2+ compliant tag map applied via provider default_tags."
  value       = module.tags.common_tags
}

output "media_bucket_id" {
  description = "Media S3 bucket ID."
  value       = module.foundation.media_bucket_id
}

output "sqs_queue_url" {
  description = "Medusa event bus SQS queue URL."
  value       = module.foundation.sqs_queue_url
}

output "sns_topic_arn" {
  description = "Medusa event bus SNS topic ARN."
  value       = module.foundation.sns_topic_arn
}

output "secret_arns" {
  description = "Map of secret name to Secrets Manager ARN."
  value       = module.foundation.secret_arns
  sensitive   = true
}
