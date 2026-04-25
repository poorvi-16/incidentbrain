locals {
  minimum_payments_service_db_class = "db.r6g.large"
}

resource "aws_db_instance" "payments_service" {
  identifier = "payments-service-primary"

  lifecycle {
    precondition {
      condition     = contains(["db.r6g.large", "db.r6g.xlarge", "db.r6g.2xlarge"], var.payments_service_db_instance_class)
      error_message = "payments-service must use an instance class that can sustain expected production query load."
    }
  }
}