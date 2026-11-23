"use client";

import { Form, Load, Select, useData, request, json, value } from "./api";

type Settings = {
  mode: "OFFLINE" | "SANDBOX"; provider: string; sandboxAllowed: boolean; encryptionConfigured: boolean;
  credentials: { provider: string; lastFour: string }[];
};

export function PaymentGateways() {
  const query = useData<Settings>("gateways");
  const settings = query.data;
  return <Load query={query}>{settings && <div className="v-stack">
    <section className="v-panel v-stack">
      <h2>Website booking mode</h2>
      <p className="v-muted">Offline accepts reservation requests for staff approval. Sandbox uses the built-in simulator and takes no real payments.</p>
      <Form key={settings.mode + settings.provider} label="Save booking mode" submit={(form) => request("gateways", json({ action: "SETTINGS", mode: value(form, "mode"), provider: value(form, "provider") }))}>
        <Select label="Booking mode" name="mode" options={settings.sandboxAllowed ? ["OFFLINE", "SANDBOX"] : ["OFFLINE"]} initial={settings.mode} />
        <Select label="Planned gateway" name="provider" options={[{ id: "SIMULATOR", name: "Built-in simulator" }, { id: "RAZORPAY", name: "Razorpay" }, { id: "STRIPE", name: "Stripe" }]} initial={settings.provider} />
      </Form>
    </section>
    <section className="v-panel v-stack">
      <h2>Future gateway test credentials</h2>
      <p className="v-muted">Saved test keys are encrypted. The built-in simulator handles sandbox checkout until a provider adapter is connected.</p>
      {!settings.encryptionConfigured && <p role="status">A deployment encryption key is required to save credentials.</p>}
      {(["RAZORPAY", "STRIPE"] as const).map((provider) => {
        const saved = settings.credentials.find((row) => row.provider === provider);
        return <div className="v-panel v-stack" key={provider}>
          <h3>{provider === "RAZORPAY" ? "Razorpay" : "Stripe"}</h3>
          <p className="v-muted">{saved ? `Test key saved · ending ${saved.lastFour}` : "No test key saved"}</p>
          {settings.encryptionConfigured && <Form key={saved?.lastFour} resetOnSuccess label="Save test credentials" submit={async (form) => {
            await request("gateways", json({ action: "SAVE_TEST_KEYS", provider, keyId: value(form, "keyId"), secret: value(form, "secret"), webhookSecret: value(form, "webhookSecret") }));
          }}>
            <label>{provider === "RAZORPAY" ? "Test key ID" : "Test publishable key"}<input name="keyId" required autoComplete="off" maxLength={250} /></label>
            <label>Test secret key<input name="secret" type="password" required autoComplete="new-password" maxLength={500} /></label>
            <label>Test webhook signing secret<input name="webhookSecret" type="password" autoComplete="new-password" maxLength={500} /></label>
          </Form>}
          {saved && <Form label="Remove test credentials" confirm="Remove the saved credentials for this provider?" submit={() => request("gateways", json({ action: "REMOVE_TEST_KEYS", provider }))}>{null}</Form>}
        </div>;
      })}
    </section>
  </div>}</Load>;
}
