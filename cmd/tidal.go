package main

import (
	"log"

	"github.com/bkenio/tidal/internal/commands"
	"github.com/bkenio/tidal/internal/utils"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/spf13/cobra"
)

func main() {
	var apiCommand = &cobra.Command{
		Use:   "api",
		Short: "Runs the tidal api server",
		Args:  cobra.MinimumNArgs(0),
		Run: func(cmd *cobra.Command, args []string) {
			tidalConfigDir, _ := cmd.Flags().GetString("tidalConfigDir")
			utils.LoadConfig(tidalConfigDir)
			port, _ := cmd.Flags().GetString("port")
			app := fiber.New()
			app.Use(cors.New())
			app.Use(recover.New())
			commands.SetupRoutes(app)
			log.Panic(app.Listen(":" + port))
		},
	}

	var ingestCommand = &cobra.Command{
		Use:   "ingest [rclone_source rclone_dest]",
		Short: "Runs full video encode pipeline",
		Args:  cobra.MinimumNArgs(2),
		Run: func(cmd *cobra.Command, args []string) {
			tidalConfigDir, _ := cmd.Flags().GetString("tidalConfigDir")
			utils.LoadConfig(tidalConfigDir)
			commands.Pipeline(commands.PipelineEvent{
				RcloneSource: args[0],
				RcloneDest:   args[1],
			})
		},
	}

	var tidalConfigDir string

	var rootCmd = &cobra.Command{Use: "tidal"}
	rootCmd.PersistentFlags().StringVar(&tidalConfigDir, "tidalConfigDir", "/mnt/tidal", "the path to the tidal env file dir")

	rootCmd.AddCommand(apiCommand)
	apiCommand.Flags().String("port", "4000", "port the tidal api server should run on")

	rootCmd.AddCommand(ingestCommand)
	rootCmd.Execute()
}
