// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />


// Domain
const domainMap = new Map();
domainMap.set("dev", "cip113-policy-manager-dev.fluidtokens.com");
domainMap.set("qa", "cip113-policy-manager-qa.fluidtokens.com");
domainMap.set("prod", "cip113-policy-manager.fluidtokens.com");

// Env
const envPathMap = new Map();
envPathMap.set("dev", ".env.development");
envPathMap.set("qa", ".env.qa");
envPathMap.set("prod", ".env.production");

export default $config({
  app(input) {
    return {
      name: 'ft-cip113-policy-manager',
      removal: input?.stage === 'prod' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          region: 'eu-west-1',
          profile: 'fluidtokens',
        },
      },
    };
  },
  async run() {

    // Dynamic import of dotenv
    const dotenv = await import('dotenv');
    const fs = await import('fs');
    const path = await import('path');

    const stage = $app.stage;

    const projectRoot = path.resolve(__dirname, "../../");
    const envPath = path.join(projectRoot, envPathMap.get(stage)); // Construct the correct path

    // Load environment variables
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else {
      throw new Error(`.env file not found at path: ${envPath}`);
    }

    // Transform environment variables to the correct format
    const envConfig = dotenv.parse(fs.readFileSync(envPath)); // Parse file content
    const formattedEnv = Object.entries(envConfig)
      .map(([key, value]) => `${key}:"${value}"`)
      .join(", ");

    const nextjs = new sst.aws.Nextjs('Cip113PolicyManagerFrontend', {
      domain: {
        name: domainMap.get(stage),
        dns: false,
        cert: envConfig.AWS_CERT,
      },
      transform: {
        server: {
          logging: {
            retention: '2 weeks',
          },
        },
      },
      environment: {
        formattedEnv
      },
    });

    return {
      cloudfront_url: nextjs.nodes.cdn?.url,
      custom_domain: nextjs.url,
    };

  },
});
