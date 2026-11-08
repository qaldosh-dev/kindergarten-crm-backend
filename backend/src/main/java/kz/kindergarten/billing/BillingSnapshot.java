package kz.kindergarten.billing;

import kz.kindergarten.billing.BillingCalculator.*;

/** Persisted with the calculation so later edits cannot alter its inputs or explanation. */
public record BillingSnapshot(Input input, Calculation calculation) {}
