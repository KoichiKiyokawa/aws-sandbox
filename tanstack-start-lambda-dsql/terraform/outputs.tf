output "app_url" {
  description = "Public Lambda Function URL for SSR, API routes and static assets."
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "lambda_function_name" {
  value = aws_lambda_function.app.function_name
}

output "dsql_endpoint" {
  value = local.dsql_endpoint
}

output "dsql_cluster_arn" {
  value = aws_dsql_cluster.main.arn
}

output "assets_bucket" {
  value = aws_s3_bucket.assets.id
}

output "aws_region" {
  value = var.aws_region
}
