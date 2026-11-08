package kz.kindergarten.attendance;

import jakarta.validation.Valid;
import java.time.LocalDate;
import kz.kindergarten.attendance.AttendanceDtos.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups/{id}/attendance")
public class AttendanceController {
    private final AttendanceService service;

    public AttendanceController(AttendanceService service) { this.service = service; }

    @GetMapping
    public GroupAttendance get(@PathVariable long id, @RequestParam LocalDate date) { return service.get(id, date); }

    @PutMapping
    public GroupAttendance save(@PathVariable long id, @RequestParam LocalDate date, @Valid @RequestBody SaveAttendance request) { return service.save(id, date, request); }
}
