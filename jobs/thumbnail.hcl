job "thumbnail" {
  type        = "batch"
  datacenters = ["dc1"]
  priority    = 100

  parameterized {
    payload       = "optional"
    meta_required = [
      "cmd",
      "s3_in",
      "s3_out",
    ]
  }

  task "thumbnail" {
    restart {
      attempts = 1
      delay    = "10s"
    }

    driver = "raw_exec"

    config {
      command = "/usr/bin/bash"
      args    = [
        "/mnt/tidal/dev/scripts/thumbnail.sh",
        "${NOMAD_META_S3_IN}",
        "${NOMAD_META_S3_OUT}",
        "${NOMAD_META_CMD}",
      ]
    }
  }
}