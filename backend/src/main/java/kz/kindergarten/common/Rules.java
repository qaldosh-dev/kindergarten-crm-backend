package kz.kindergarten.common;

import java.time.LocalDate;
import java.util.Objects;

public final class Rules {
    private Rules() {}

    public static void version(VersionedEntity entity, Long expected) {
        if (expected == null) {
            throw new IllegalArgumentException("version обязателен");
        }
        if (!Objects.equals(entity.getVersion(), expected)) {
            throw ApiException.conflict();
        }
    }

    public static void period(LocalDate from, LocalDate to) {
        if (from == null || (to != null && to.isBefore(from))) {
            throw ApiException.rule("Некорректные границы периода");
        }
    }

    public static String reason(String value) {
        if (value == null || value.isBlank()) {
            throw ApiException.rule("Укажите причину изменения");
        }
        return value.trim();
    }

    public static String comment(String value) {
        return value == null ? "" : value;
    }
}
