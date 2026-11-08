package kz.kindergarten.illness;

import org.mapstruct.*;
import kz.kindergarten.illness.IllnessDtos.*;

@Mapper(componentModel = "spring")
public interface IllnessMapper {
    @Mapping(target = "childId", source = "child.id")
    CertificateView view(IllnessCertificate entity);
}
