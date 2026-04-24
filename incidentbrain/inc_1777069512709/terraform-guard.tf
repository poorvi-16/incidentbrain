locals {
  required_platform_core_controls = ["drift-detection", "protected-config-review"]
}

resource "null_resource" "platform_core_config_guard" {
  lifecycle {
    precondition {
      condition     = alltrue([for control in local.required_platform_core_controls : contains(var.enabled_controls, control)])
      error_message = "platform-core requires drift detection and protected config review controls before release."
    }
  }
}