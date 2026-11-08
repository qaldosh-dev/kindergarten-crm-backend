FROM maven:3.9.16-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system kindergarten && useradd --system --gid kindergarten --home-dir /app kindergarten
COPY --from=build --chown=kindergarten:kindergarten /workspace/target/kindergarten-backend-1.0.0.jar /app/application.jar
USER kindergarten
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -Dfile.encoding=UTF-8 -Duser.timezone=Asia/Qyzylorda"
ENTRYPOINT ["java", "-jar", "/app/application.jar"]
