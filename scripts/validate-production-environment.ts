import { loadEnvConfig } from "@next/env";

import {
  DeploymentConfigurationError,
  validateProductionEnvironment,
} from "../server/config/production-environment";

loadEnvConfig(process.cwd(), false);

try {
  const result = validateProductionEnvironment();
  process.stdout.write(
    `Production configuration is valid (${result.checkedVariables.length} variables checked; values hidden).\n`,
  );
} catch (reason) {
  const message = reason instanceof DeploymentConfigurationError
    ? reason.message
    : "Production configuration validation failed for an unknown reason.";
  process.stderr.write(`${message}\nNo environment-variable values were printed.\n`);
  process.exitCode = 1;
}
