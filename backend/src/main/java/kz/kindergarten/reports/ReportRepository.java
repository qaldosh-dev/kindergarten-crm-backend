package kz.kindergarten.reports;

import java.time.*;
import java.util.List;
import java.util.Map;
import kz.kindergarten.reports.ReportDtos.BillingRow;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** One explicit aggregate query avoids multiplying ledger amounts by joined payments or contacts. */
@Repository
public class ReportRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public ReportRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<BillingRow> billing(YearMonth month, LocalDate today) {
        String sql = """
                with ledger_totals as (
                  select e.child_id, sum(e.amount) balance,
                    coalesce(sum(e.amount) filter (where i.month=:month),0) charged,
                    coalesce(sum(e.amount) filter (where e.type='REFUND' and e.paid_on between :month and :end),0) refunded
                  from account_entry e left join invoice i on i.id=e.invoice_id group by e.child_id
                ), cashflow as (
                  select child_id, sum(amount) paid from payment
                  where cancelled_at is null and paid_on between :month and :end group by child_id
                ), stale as (
                  select child_id, bool_or(needs_reconciliation) needs_reconciliation from invoice
                  where month=:month and status='ISSUED' group by child_id
                )
                select c.id child_id,c.full_name child_name,g.name group_name,
                  coalesce(l.charged,0) charged,coalesce(p.paid,0) paid,coalesce(l.refunded,0) refunded,
                  coalesce(l.balance,0) balance,greatest(coalesce(l.balance,0),0) debt,
                  greatest(-coalesce(l.balance,0),0) credit,coalesce(s.needs_reconciliation,false) needs_reconciliation
                from child c
                left join ledger_totals l on l.child_id=c.id
                left join cashflow p on p.child_id=c.id
                left join stale s on s.child_id=c.id
                left join lateral (
                  select group_id from child_group_membership where child_id=c.id and valid_from<=:today
                  order by valid_from desc,id desc limit 1
                ) m on true
                left join kindergarten_group g on g.id=m.group_id
                order by c.full_name,c.id
                """;
        return jdbc.query(sql, Map.of("month", month.atDay(1), "end", month.atEndOfMonth(), "today", today),
                (row, number) -> new BillingRow(row.getLong("child_id"), row.getString("child_name"), row.getString("group_name"),
                        row.getBigDecimal("charged"), row.getBigDecimal("paid"), row.getBigDecimal("refunded"), row.getBigDecimal("balance"),
                        row.getBigDecimal("debt"), row.getBigDecimal("credit"), row.getBoolean("needs_reconciliation")));
    }
}
