# Paydll — App Context

What it does: Payment and billing management for small businesses
Target user: Small businesses and freelancers in India
Key features: Invoice generation, payment tracking, Razorpay integration, expense reports
Shared packages: shared-auth, shared-payments, shared-analytics, shared-supabase
Current phase: Phase 1 — Base Setup

App-specific rules:
- Payment flows must be tested end-to-end in sandbox before merging
- All invoices stored as PDF in Supabase storage
- GST calculation required for Indian billing
