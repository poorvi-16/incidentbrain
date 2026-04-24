locals {
  required_edge_api_controls = ["drift-detection", "protected-config-review"]
}

resource "null_resource" "edge_api_config_guard" {
  lifecycle {
    precondition {
      condition     = alltrue([for control in local.required_edge_api_controls : contains(var.enabled_controls, control)])
      error_message = "edge-api requires drift detection and protected config review controls before release."
    }
  }
}