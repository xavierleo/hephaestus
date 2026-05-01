export function generateArrConfig(name: string, port: number, apiKey: string): string {
  return `<Config>
  <BindAddress>*</BindAddress>
  <Port>${port}</Port>
  <SslPort>${port + 909}</SslPort>
  <EnableSsl>False</EnableSsl>
  <LaunchBrowser>True</LaunchBrowser>
  <ApiKey>${apiKey}</ApiKey>
  <AuthenticationMethod>None</AuthenticationMethod>
  <AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>
  <Branch>main</Branch>
  <LogLevel>info</LogLevel>
  <UrlBase></UrlBase>
  <InstanceName>${name}</InstanceName>
</Config>`
}
