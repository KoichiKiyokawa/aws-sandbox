variable "aws_region" {
  description = "AWS region for both Lambda and the single-region DSQL cluster."
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "Prefix for the Lambda function, log group and IAM role."
  type        = string
  default     = "tanstack-start-lambda-dsql"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,29}$", var.project_name))
    error_message = "Use 3-30 lowercase letters, digits or hyphens, starting with a letter."
  }
}

variable "deletion_protection_enabled" {
  description = "Enable deletion protection for the DSQL cluster."
  type        = bool
  default     = true
}

variable "lambda_memory_mb" {
  description = "Lambda memory in MiB."
  type        = number
  default     = 512

  validation {
    condition     = var.lambda_memory_mb >= 128 && var.lambda_memory_mb <= 10240 && floor(var.lambda_memory_mb) == var.lambda_memory_mb
    error_message = "Lambda memory must be an integer between 128 and 10240 MiB."
  }
}
