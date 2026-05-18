declare module 'next-pwa' {
    import { NextConfig } from 'next';

    interface PWAConfig {
        dest?: string;
        disable?: boolean;
        register?: boolean;
        scope?: string;
        sw?: string;
        skipWaiting?: boolean;
        buildExcludes?: Array<RegExp | string>;
        [key: string]: unknown;
    }

    function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;

    export default withPWA;
}

// Declaración para archivos CSS
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
