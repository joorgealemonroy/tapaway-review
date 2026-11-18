import QRCodeModule from "react-qr-code";

// react-qr-code ships CommonJS. Production bundling unwraps its default export, but some
// dev-server interop layers hand back the whole module object ({ default, QRCode }), which
// crashes rendering ("Element type is invalid"). Resolve the component explicitly either way.
const maybeWrapped = QRCodeModule as unknown as { default?: typeof QRCodeModule };
const QRCode: typeof QRCodeModule =
  typeof maybeWrapped === "object" && maybeWrapped.default ? maybeWrapped.default : QRCodeModule;

export default QRCode;
