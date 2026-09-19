resource "aws_dsql_cluster" "main" {
  deletion_protection_enabled = var.deletion_protection_enabled

  tags = {
    Name = var.project_name
  }
}

locals {
  dsql_endpoint = "${aws_dsql_cluster.main.identifier}.dsql.${var.aws_region}.on.aws"
}
