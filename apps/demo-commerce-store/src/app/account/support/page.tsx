import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { Alert } from "@/components/ui/alert";
import { getCurrentCustomer } from "@/lib/customer-auth";

export default async function CustomerSupportPage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    redirect("/login?returnTo=/account/support");
  }

  return (
    <CustomerShell customer={customer}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Support</p>
          <h1>Northstar Assistant</h1>
          <p className="muted">Open the assistant bubble and ask about products, policies, or your latest order.</p>
        </div>
      </div>
      <div className="grid two">
        <section className="card">
          <h2>Try these requests</h2>
          <ul>
            <li>What backpacks do you sell?</li>
            <li>Where is my latest order?</li>
            <li>Cancel my latest order.</li>
            <li>Please resend my receipt for my latest order.</li>
            <li>Delete my customer record.</li>
          </ul>
        </section>
        <Alert>
          Business-changing requests route through AgentGate first. Customers see safe language, while the demo debug panel can show decision, risk, and IDs.
        </Alert>
      </div>
    </CustomerShell>
  );
}
