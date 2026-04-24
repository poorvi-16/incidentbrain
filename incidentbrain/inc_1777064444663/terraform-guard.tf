locals {
  require_request_coalescing = true
}

resource "null_resource" "catalog_api_cache_guard" {
  lifecycle {
    precondition {
      condition     = var.enable_request_coalescing == local.require_request_coalescing
      error_message = "catalog-api must enable request coalescing before high-traffic cache invalidations."
    }
  }
}