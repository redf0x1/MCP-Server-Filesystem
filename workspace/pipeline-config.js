// Demo pipeline configuration file for testing MCP filesystem operations
const pipelineConfig = {
    name: "demo-pipeline",
    version: "1.0.0",
    description: "Demonstration pipeline for MCP server testing",
    stages: [
        "validate",
        "build",
        "test", 
        "deploy",
        "cleanup"
    ],
    environment: {
        development: {
            deploy_target: "dev-server",
            auto_deploy: true
        },
        production: {
            deploy_target: "prod-cluster",
            auto_deploy: false,
            approval_required: true
        }
    },
    notifications: {
        slack: "#deployments",
        email: ["admin@example.com"]
    }
};

module.exports = pipelineConfig;
