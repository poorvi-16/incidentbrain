locals {
  minimum_payments_db_instance_class = "db.r6g.large"
}

resource "aws_db_instance" "payments" {
  identifier = "payments-primary"

  lifecycle {
    precondition {
      condition     = contains(["db.r6g.large", "db.r6g.xlarge", "db.r6g.2xlarge"], var.payments_db_instance_class)
      error_message = "payments DB instance class must meet minimum sizing requirements."
    }
  }
}