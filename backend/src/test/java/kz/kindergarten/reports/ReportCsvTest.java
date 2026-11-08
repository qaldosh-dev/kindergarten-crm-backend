package kz.kindergarten.reports;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ReportCsvTest {
    @Test
    void quotesNamesAndMitigatesSpreadsheetFormulaInjection() {
        assertThat(ReportService.csvText("=SUM(1,2)")).isEqualTo("\"'=SUM(1,2)\"");
        assertThat(ReportService.csvText("  +123")).startsWith("\"'");
        assertThat(ReportService.csvText("Демо, \"Имя\"\nСтрока")).isEqualTo("\"Демо, \"\"Имя\"\"\nСтрока\"");
        assertThat(ReportService.csvText(null)).isEqualTo("\"\"");
    }
}
