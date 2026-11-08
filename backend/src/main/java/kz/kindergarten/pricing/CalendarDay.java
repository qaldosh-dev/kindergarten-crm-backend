package kz.kindergarten.pricing;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "calendar_day")
public class CalendarDay {
    @Id
    private LocalDate date;
    private boolean baseWorking;
    private boolean closed;
    private String reason = "";
    @Version
    private Long version;

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate value) { date = value; }
    public boolean getBaseWorking() { return baseWorking; }
    public void setBaseWorking(boolean value) { baseWorking = value; }
    public boolean getClosed() { return closed; }
    public void setClosed(boolean value) { closed = value; }
    public String getReason() { return reason; }
    public void setReason(String value) { reason = value; }
    public Long getVersion() { return version; }
}
