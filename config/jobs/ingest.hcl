job "ingest" {
  priority    = 1
  type        = "batch"
  datacenters = ["dc1"]

  constraint {
    operator  = "="
    value     = "amd64"
    attribute = "${attr.cpu.arch}"
  }

  parameterized {
    payload       = "optional"
    meta_required = [
      "rclone_source",
      "rclone_dest",
      "webhook_url",
    ]
  }

  group "tidal" {
    task "ingest" {
      driver = "raw_exec"

      restart {
        attempts = 1
        delay    = "10s"
      }

      resources {
        cpu    = 4000
        memory = 4000
      }

      config {
        command = "tidal"
        args    = [
          "ingest",
          "${NOMAD_META_RCLONE_SOURCE}",
          "${NOMAD_META_RCLONE_DEST}",
          "--webhookURL",
          "${NOMAD_META_WEBHOOK_URL}"
        ]
      }
    }

    reschedule {
      attempts = 0
    }
  }
}