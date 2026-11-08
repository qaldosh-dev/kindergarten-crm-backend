package kz.kindergarten;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class KindergartenApplication {
    public static void main(String[] args) { SpringApplication.run(KindergartenApplication.class, args); }
    @Bean Clock clock() { return Clock.systemUTC(); }
}
