data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../app/.output/server"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project_name}"
  retention_in_days = 14
}

resource "aws_lambda_function" "app" {
  function_name    = var.project_name
  description      = "TanStack Start sandbox with Aurora DSQL connection settings"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  # Code is initialized here; subsequent releases use mise run app:deploy.
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  memory_size = var.lambda_memory_mb
  timeout     = 30

  environment {
    variables = {
      NODE_ENV    = "production"
      PGHOST      = local.dsql_endpoint
      PGPORT      = "5432"
      PGDATABASE  = "postgres"
      PGUSER      = "admin"
      PGSSLMODE   = "verify-full"
      DSQL_REGION = var.aws_region
    }
  }

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.lambda.name
  }

  depends_on = [aws_iam_role_policy.lambda]
}

resource "aws_lambda_function_url" "app" {
  function_name      = aws_lambda_function.app.function_name
  authorization_type = "NONE"
  invoke_mode        = "BUFFERED"
}

resource "aws_lambda_permission" "function_url" {
  statement_id           = "PublicFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.app.function_name
  principal              = "*"
  function_url_auth_type = aws_lambda_function_url.app.authorization_type
}

resource "aws_lambda_permission" "invoke_via_url" {
  statement_id             = "PublicInvokeViaFunctionUrlOnly"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.app.function_name
  principal                = "*"
  invoked_via_function_url = true

  depends_on = [aws_lambda_function_url.app]
}
