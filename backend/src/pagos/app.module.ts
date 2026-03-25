import { PagosController } from './pagos/pagos.controller';
import { PagosService } from './pagos/pagos.service';

@Module({
  controllers: [PagosController],
  providers: [PagosService],
})
