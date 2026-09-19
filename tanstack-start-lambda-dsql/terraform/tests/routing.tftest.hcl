mock_provider "aws" {
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/test-lambda" }
  }
  mock_resource "aws_cloudwatch_log_group" {
    defaults = { arn = "arn:aws:logs:ap-northeast-1:123456789012:log-group:/aws/lambda/test" }
  }
  mock_resource "aws_dsql_cluster" {
    defaults = {
      arn        = "arn:aws:dsql:ap-northeast-1:123456789012:cluster/test"
      identifier = "test-cluster"
    }
  }
  mock_resource "aws_s3_bucket" {
    defaults = { arn = "arn:aws:s3:::test-assets" }
  }
}

run "routing_and_database" {
  command = apply
  assert {
    condition     = aws_cloudfront_distribution.app.default_cache_behavior[0].target_origin_id == "lambda" && aws_cloudfront_distribution.app.ordered_cache_behavior[0].target_origin_id == "assets"
    error_message = "Dynamic requests and static assets must have separate origins."
  }
  assert {
    condition     = aws_cloudfront_distribution.app.default_cache_behavior[0].cache_policy_id == "413f160a-8c7d-4f44-9df3-4b5a84be39ad"
    error_message = "SSR/API responses must not be cached."
  }
  assert {
    condition     = aws_s3_bucket_public_access_block.assets.block_public_policy && jsondecode(aws_s3_bucket_policy.assets.policy).Statement[0].Condition.StringEquals["AWS:SourceArn"] == aws_cloudfront_distribution.app.arn
    error_message = "S3 reads must be scoped to this CloudFront distribution."
  }
  assert {
    condition     = aws_lambda_function.app.environment[0].variables.PGHOST == "test-cluster.dsql.ap-northeast-1.on.aws"
    error_message = "Lambda must receive the DSQL endpoint."
  }
}
