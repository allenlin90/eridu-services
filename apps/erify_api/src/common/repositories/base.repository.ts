// Base interface for soft-deletable entities
export interface WithSoftDelete {
  deletedAt: Date | null;
}

// Base interface for repository model
export interface IBaseModel<T, C, U, W> {
  create(args: { data: C }): Promise<T>;
  findFirst(args: { where: W }): Promise<T | null>;
  findMany(args: {
    where?: W;
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<T[]>;
  update(args: { where: W; data: U }): Promise<T>;
  delete(args: { where: W }): Promise<T>;
  count(args: { where: W }): Promise<number>;
}

// Base repository interface
export interface IBaseRepository<T, C, U, W> {
  create(data: C): Promise<T>;
  findOne(where: W): Promise<T | null>;
  findMany(params: {
    where?: W;
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<T[]>;
  update(where: W, data: U): Promise<T>;
  delete(where: W): Promise<T>;
  softDelete(where: W): Promise<T>;
  restore(where: W): Promise<T>;
  count(where: W): Promise<number>;
}

// Base repository implementation with generics
export abstract class BaseRepository<T extends WithSoftDelete, C, U, W>
  implements IBaseRepository<T, C, U, W>
{
  constructor(protected readonly model: IBaseModel<T, C, U, W>) {}

  async create(data: C): Promise<T> {
    return this.model.create({ data });
  }

  async findOne(where: W): Promise<T | null> {
    return this.model.findFirst({
      where: { ...where, deletedAt: null } as W,
    });
  }

  async findMany<O extends Record<string, 'asc' | 'desc'>>(params: {
    where?: W;
    skip?: number;
    take?: number;
    orderBy?: O;
  }): Promise<T[]> {
    const where = params.where;
    const skip = params.skip;
    const take = params.take;
    const orderBy = params.orderBy;

    return this.model.findMany({
      where: { ...where, deletedAt: null } as W,
      skip,
      take,
      orderBy,
    });
  }

  async update(where: W, data: U): Promise<T> {
    return this.model.update({
      where: { ...where, deletedAt: null } as W,
      data,
    });
  }

  async delete(where: W): Promise<T> {
    return this.model.delete({
      where: { ...where, deletedAt: null } as W,
    });
  }

  async softDelete(where: W): Promise<T> {
    return this.model.update({
      where: { ...where, deletedAt: null } as W,
      data: { deletedAt: new Date() } as unknown as U,
    });
  }

  async restore(where: W): Promise<T> {
    return this.model.update({
      where: { ...where, deletedAt: null },
      data: { deletedAt: null } as unknown as U,
    });
  }

  async count(where: W): Promise<number> {
    return this.model.count({
      where: { ...where, deletedAt: null } as W,
    });
  }
}
